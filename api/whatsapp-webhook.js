// BoostKaro WhatsApp webhook endpoint (Meta WhatsApp Business Platform).
// GET  — Meta verification handshake (hub.mode / hub.verify_token / hub.challenge).
// POST — incoming message + status events; acknowledged with 200. Event handling
//        is intentionally minimal for now (delivery logs arrive via the sender).
const VERIFY_TOKEN = "fa73520d429945084a48edcf97ee3928";

module.exports = (req, res) => {
  if (req.method === "GET") {
    const q = req.query || {};
    if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === VERIFY_TOKEN) {
      res.status(200).send(q["hub.challenge"]);
    } else {
      res.status(403).send("Verification failed");
    }
    return;
  }
  if (req.method === "POST") {
    // Acknowledge immediately; Meta retries non-200 responses.
    res.status(200).json({ received: true });
    return;
  }
  res.status(405).send("Method not allowed");
};
