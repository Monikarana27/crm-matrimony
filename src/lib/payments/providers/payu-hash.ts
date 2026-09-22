import crypto from "crypto";

// PayU's request hash sequence:
// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
export function generatePayuRequestHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  salt: string;
}) {
  const { key, txnid, amount, productinfo, firstname, email, salt } = params;
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

// PayU's response/webhook hash sequence (reversed order, includes status):
// sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
export function verifyPayuResponseHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  salt: string;
  receivedHash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}) {
  const {
    key, txnid, amount, productinfo, firstname, email, status, salt, receivedHash,
    udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
  } = params;

  // Built as an array + join to avoid manual pipe-counting mistakes.
  // Format: salt|status|<5 blank udf6-10 slots>|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const parts = [
    salt, status, "", "", "", "", "",
    udf5, udf4, udf3, udf2, udf1,
    email, firstname, productinfo, amount, txnid, key,
  ];
  const hashString = parts.join("|");
  const expectedHash = crypto.createHash("sha512").update(hashString).digest("hex");
  return expectedHash === receivedHash;
}