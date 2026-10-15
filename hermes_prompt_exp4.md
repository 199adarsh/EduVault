# Hermes Prompt: SQLQuest Experiment 4 (Q10–Q27)

Execute from Home (`https://sqlquestbykp.vercel.app/`) after clicking **Labs → Experiment 4**:

```js
(async () => {
  const chips = document.querySelectorAll('.lab-qchip');
  const sqlMap = {
    10: "SELECT branch_name, assets FROM branch;",
    11: "SELECT * FROM loan WHERE amount > 1000;",
    12: "SELECT * FROM account WHERE balance < 700;",
    13: "SELECT * FROM account WHERE branch_name = 'Perryridge' AND balance < 1000;",
    14: "SELECT DISTINCT branch_name FROM loan;",
    15: "SELECT loan_number FROM loan WHERE branch_name = 'Perryridge' AND amount > 1200;",
    16: "SELECT customer_name FROM customer WHERE customer_street LIKE '%Main%';",
    17: "SELECT account_number FROM account WHERE branch_name = 'Perryridge' AND balance > 500;",
    18: "SELECT DISTINCT branch_city FROM branch;",
    19: "SELECT customer_name FROM borrower UNION SELECT customer_name FROM depositor;",
    20: "SELECT customer_name FROM borrower INTERSECT SELECT customer_name FROM depositor;",
    21: "SELECT customer_name FROM depositor EXCEPT SELECT customer_name FROM borrower;",
    22: "SELECT AVG(balance) FROM account WHERE branch_name = 'Perryridge';",
    23: "SELECT branch_name, COUNT(DISTINCT customer_name) FROM depositor NATURAL JOIN account GROUP BY branch_name;",
    24: "SELECT branch_name, AVG(balance) FROM account GROUP BY branch_name HAVING AVG(balance) > 1200;",
    25: "SELECT MAX(amount) FROM loan;",
    26: "SELECT customer_name FROM borrower WHERE customer_name NOT IN (SELECT customer_name FROM depositor);",
    27: "SELECT branch_name FROM branch WHERE assets > (SELECT MAX(assets) FROM branch WHERE branch_city = 'Brooklyn');"
  };

  for (let q = 10; q <= 27; q++) {
    const chip = chips[q - 1];
    if (!chip || chip.classList.contains('done')) continue;
    chip.click();
    await new Promise(r => setTimeout(r, 600));

    const cm = document.querySelector('.cm-content')?.cmView?.view;
    if (cm && sqlMap[q]) {
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: sqlMap[q] } });
      await new Promise(r => setTimeout(r, 300));
      document.querySelector('.btn-execute')?.click();
      await new Promise(r => setTimeout(r, 1200));
    }
  }
})();
```
