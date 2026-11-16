async function testQuery() {
  const resAll = await fetch('http://localhost:5000/api/expert/verified');
  const dAll = await resAll.json();
  console.log('ALL count:', dAll.count);

  const resIT = await fetch('http://localhost:5000/api/expert/verified?category=IT');
  const dIT = await resIT.json();
  console.log('IT count:', dIT.count);

  const resWeb = await fetch('http://localhost:5000/api/expert/verified?category=Web%20Development');
  const dWeb = await resWeb.json();
  console.log('Web Development count:', dWeb.count);

  const resEmpty = await fetch('http://localhost:5000/api/expert/verified?category=Test');
  const dEmpty = await resEmpty.json();
  console.log('Test category (empty) count:', dEmpty.count);
}
testQuery().catch(console.error);
