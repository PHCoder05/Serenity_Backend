const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PETPOOJA_MOCK_PORT || 3999);
const fixturePath = path.join(
  __dirname,
  '..',
  'fixtures',
  'petpooja-push-menu.sample.json',
);

const menuFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const responses = {
  '/save_order': {
    success: '1',
    message: 'Your order is saved.',
    restID: 'test-rest-id',
    clientOrderID: 'A-1',
    orderID: '26',
  },
  '/mapped_restaurant_menus': menuFixture,
  '/update_order_status': {
    success: '1',
    message: 'Order status updated successfully.',
  },
  '/rider_status_update': {
    success: '1',
    message: 'Rider status updated successfully.',
  },
};

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Method Not Allowed' }));
    return;
  }

  const pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  const body = responses[pathname];

  if (!body) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `Unknown path: ${pathname}` }));
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
  });
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`PetPooja mock server listening on ${port}`);
});
