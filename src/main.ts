import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs';
const puppeteerStealth = StealthPlugin();
puppeteerStealth.enabledEvasions.delete('user-agent-override');
puppeteer.use(puppeteerStealth);


let alerts = null;
let timeout = 0;

// puppeteer usage as normal
puppeteer.launch({ headless: false, targetFilter: target => target.type() !== 'other' }).then(async browser => {
  const page = await browser.newPage()
  await page.goto('https://birdeye.so/new-listings?chain=solana')
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await delay(15000)

  await checkAlert(page);

  await page.screenshot({ path: 'screenshot.png', fullPage: true })
  await browser.close()
});


async function delay(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve()
    }, timeout);
  })
}

async function checkAlert(page) {

  if (!alerts) {
    await new Promise((resolve, reject) => {
      fs.readFile('alerts.json', (err, data) => {
        if (err) alerts = {};
        else {
          try {
            alerts = JSON.parse(data);
          } catch {
            alerts = {};
          }
        }
        resolve();
      });
    });
  }

  const three = await page.evaluate(async () => {
    return await fetch('https://multichain-api.birdeye.so/multichain/gems/new_listing', {
      method: 'post',
      body: JSON.stringify({
        'sort_type': 'desc',
        'query': [{ 'keyword': 'createdAt', 'operator': 'gte', 'value': '12h' }, {
          'keyword': 'liquidity',
          'operator': 'gte',
          'value': 10000,
        }, { 'keyword': 'liquidity', 'operator': 'lt', 'value': 1000000000 }, {
          'keyword': 'v24hUSD',
          'operator': 'gte',
          'value': 25000,
        }, { 'keyword': 'v24hUSD', 'operator': 'lt', 'value': 5000000000 }, {
          'keyword': 'mc',
          'operator': 'gte',
          'value': 500000,
        }, { 'keyword': 'mc', 'operator': 'lt', 'value': 99999999999 }, {
          'keyword': 'holder',
          'operator': 'gte',
          'value': 3000,
        }, { 'keyword': 'holder', 'operator': 'lt', 'value': 50000 }],
        'offset': 0,
        'limit': 10,
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Agent-Id': window.localStorage.getItem('agent-id'),
        'Cf-Be': window.localStorage.getItem('sec-be'),
        'Token': '',
      },
    }).then((response) => {
      return response.json();
    }).then(async ({ data: { items } }) => {
      for (const { name, address, createdAt, symbol, mc, holder, v24hUSD, network } of items) {
        const data = {
          name,
          address,
          symbol,
          holder,
          mc: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            mc,
          ),
          v24hUSD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            v24hUSD,
          ),
          createdAt: (new Date(createdAt)).toLocaleString(),
          link: `https://birdeye.so/token/${address}?chain=${network}`,
        };

        console.log('data: ', JSON.stringify(data));
        if (!alerts[address]) {
          alerts[address] = data;

          // await delay(2000)
          // await sendMessage(data);
        }
      }

      fs.writeFileSync('./alerts.json', JSON.stringify(alerts), 'utf8');

      // await delay(15000)
      // checkAlert(page);
    }).catch((error) => {
      console.log('error: ' + error.toString());
    });
  });
};

