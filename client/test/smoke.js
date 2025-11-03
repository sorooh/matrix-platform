// simple smoke test for client
console.log('client smoke test: checking basic runtime');
if (typeof process === 'undefined') {
  console.error('Node runtime not found');
  process.exit(2);
}
console.log('client smoke OK');
process.exit(0);
