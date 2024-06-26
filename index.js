const express = require('express');
const cors = require("cors");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { TimeoutError } = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
puppeteer.use(StealthPlugin())


app.get('/getContent/:location', async (req, res) => {
  if (!checkOrigin(req.headers.origin)) {
      return res.send('Error');
  }

  const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'new',
  });

  try {
      const location = req.params.location;
      const results = await getResults(browser, location);
      res.json(results);
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Error2');
  }
});



async function getResults(browser, location, retryCount = 0) {
  const page = await browser.newPage();
  const MAX_RETRIES = 3;  

  await page.goto('https://fansmetrics.com/', { waitUntil: 'networkidle0' });
  await page.type('#query', location);
  await page.keyboard.press('Enter');

  let row;

  try {
      await page.waitForSelector('.js-inf-append', { timeout: 3000 });
      row = await page.$('.js-inf-append > .row');
  } catch (e) {
      if (e instanceof TimeoutError && retryCount < MAX_RETRIES) {
          console.error('Element nije pronađen nakon zadatog vremenskog intervala! Pokušavam ponovo...');
          return await getResults(browser, "Memphis", retryCount + 1);
      } else if (retryCount >= MAX_RETRIES) {
          await browser.close();
          throw new Error('Nije pronađen element na stranici nakon više pokušaja.');
      } else {
          throw e;
      }
  }

  let cards = []
  
  if (row) {
    const creatorCards = await row.$$('.col-md-4 > .creator-card-v3');
    for (const creatorCard of creatorCards) {
      try {
        const usernameElement = await creatorCard.$('.creator-info > .creator-breadcrumbs > .creator-username');
        const username = (await usernameElement.evaluate(element => element.textContent)).trim();
        
        const nameElement = await creatorCard.$('.creator-info > .creator-name');
        const name = (await nameElement.evaluate(element => element.textContent)).trim();

        const descElement = await creatorCard.$('.creator-bio');
        const desc = await descElement.evaluate(element => element.textContent);

        const imgElement = await creatorCard.$('.creator-picture > .creator-picture-link > .creator-img.js-creator-img');
        const img = await imgElement.evaluate(element => element.getAttribute('src'));

        const statsElements = await creatorCard.$$('.creator-stats > .creator-stat > b');
        let stats = null;

        if (statsElements.length === 4) {
          const priceElement = await statsElements[0].$('.flex.items-center');
          const price = (await priceElement.evaluate(element => element.textContent)).trim();

          const numOfPhotos = await statsElements[1].evaluate(element => element.textContent);
          const numOfVideos = await statsElements[2].evaluate(element => element.textContent);
          const subs = await statsElements[3].evaluate(element => element.textContent.match(/\d+/)[0]);

          stats = {
            price: price,
            numOfPhotos: numOfPhotos,
            numOfVideos: numOfVideos,
            subs: subs
          };
        }

        const user = {
          username: username,
          name: name,
          desc: desc,
          img: img,
          stats: stats
        };

        cards.push(user);
      } catch (error) {
        console.log("Error1");
      }
    }
  }

  await browser.close();
  return cards;
}


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});




function checkOrigin(origin) {

  return true;
    const allowedOrigins = [
      "https://area3.pages.dev",
      "https://area-off.pages.dev/",
      "https://ofarea.live",
      "https://ofarea.live/",
      "https://ofarea.pages.dev",
      "https://ofarea.pages.dev/",
    ];
  
    if (allowedOrigins.includes(origin)) {
      return true;
    } 
  
    return false
  }