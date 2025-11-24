-- Nth highest salary examples using different techniques.
-- Replace :n with the desired ordinal (e.g., 2 for 2nd highest).

-- Sample table definition
-- CREATE TABLE employees (
--   id INT PRIMARY KEY,
--   name VARCHAR(100),
--   salary DECIMAL(10,2)
-- );

-- Method 1: window function with DENSE_RANK (ANSI SQL:2003)
WITH ranked AS (
  SELECT
    e.*,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank
  FROM employees e
)
SELECT *
FROM ranked
WHERE salary_rank = :n;

-- Method 2: window function with ROW_NUMBER and ORDER BY salary DESC
-- Returns exactly one row per position; use ORDER BY salary DESC, id ASC to make tie-breaking explicit.
WITH ordered AS (
  SELECT
    e.*,
    ROW_NUMBER() OVER (ORDER BY salary DESC, id ASC) AS rn
  FROM employees e
)
SELECT *
FROM ordered
WHERE rn = :n;

-- Method 3: correlated subquery counting distinct higher salaries
SELECT *
FROM employees e
WHERE (
  SELECT COUNT(DISTINCT salary)
  FROM employees
  WHERE salary > e.salary
) = :n - 1;

-- Method 4: LIMIT/OFFSET over distinct salaries, then join back
-- (commonly used in MySQL/PostgreSQL). Adjust TOP/OFFSET FETCH for SQL Server/Oracle.
WITH distinct_salaries AS (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
)
, target_salary AS (
  SELECT salary
  FROM distinct_salaries
  LIMIT 1 OFFSET (:n - 1)
)
SELECT e.*
FROM employees e
JOIN target_salary t ON e.salary = t.salary;
