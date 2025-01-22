// File: airtable.js
const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function getUserByEmail(email) {
  const records = await base('Users')
	.select({
	  filterByFormula: `{Email} = "${email}"`, 
	  maxRecords: 1
	})
	.firstPage();

  return records[0];
}

module.exports = { getUserByEmail };
