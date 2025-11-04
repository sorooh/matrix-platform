// simple smoke test for server
console.log('server smoke test: checking basic runtime');
if (typeof process === 'undefined') {
  console.error('Node runtime not found');
  process.exit(2);
}
console.log('server smoke OK');
process.exit(0);
