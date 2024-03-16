async function delay(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve()
    }, timeout);
  })
}

let token = ''
let chat_id = ''
let token_request = ''

async function sendMessage({
                       name,
                       address,
                       symbol,
                       holder, mc, v24hUSD, createdAt, link,
                     }) {
  return await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    body: JSON.stringify({
      parse_mode: 'html',
      'chat_id': chat_id,
      'text': `name: <b>${name}</b>
address: <b>${address}</b>
symbol: <b>${symbol}</b>
holder: <b>${holder}</b>
mc: <b>${mc}</b>
v24hUSD: <b>${v24hUSD}</b>
createdAt: <b>${createdAt}</b>
link: <a href='${link}'>${link}</a>`,
      'disable_notification': false,
    }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      return response.json();
    })
    .catch((error) => {
      console.log(error);
    });
}


(async function getNewPair() {
  await fetch('https://multichain-api.birdeye.so/multichain/gems/new_listing', {
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
      'Token': token_request,
    },
  }).then((response) => {
    return response.json();
  }).then(async ({ data: { items } }) => {
    console.log('items', items);
    const alerts = JSON.parse(window.localStorage.getItem('address_alerts') ?? '{}');

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
      if (!alerts[address]) {
        alerts[address] = data;

        await delay(2000)
        await sendMessage(data);
      }
    }

    window.localStorage.setItem('address_alerts', JSON.stringify(alerts));
  }).catch((error) => {
    console.log(error);
  });

  await delay(30000)
})()

