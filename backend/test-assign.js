const db = require('./src/db');
const { selfAssignOrder } = require('./src/controllers/orderController');

async function test() {
  const req = {
    params: { order_id: 1 },
    body: { warehouse_id: 2 },
    user: { id: 1 } // Rider ID 1
  };
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log("RESPONSE (", code, "):", data);
      }
    }),
    json: (data) => console.log("RESPONSE SUCCESS:", data)
  };

  try {
    await selfAssignOrder(req, res);
  } catch (e) {
    console.error("FATAL ERROR IN CONTROLLER:", e);
  }
  process.exit();
}
test();
