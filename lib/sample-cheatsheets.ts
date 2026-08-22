export type SampleSection = {
  heading: string;
  content: string;
};

export type SampleCheatsheet = {
  id: string;
  courseCode: string;
  title: string;
  sourceNote: string;
  sections: SampleSection[];
  // Path under /public where the real PDF should be placed. If the file
  // isn't there, the viewer falls back to the condensed text sections above.
  pdfPath: string;
};

// Real student-submitted INFS1200 cheat sheets (via Studocu), supplied by the
// user to seed the "View sample" feature. Condensed from the original PDFs —
// module numbering follows each source document as given, even where it's
// inconsistent between documents.
const INFS1200_SAMPLES: SampleCheatsheet[] = [
  {
    id: "infs1200-cheat-sheet-v2",
    courseCode: "INFS1200",
    title: "Cheat Sheet v2",
    sourceNote: "Dense two-page A4 layout covering Modules 0-5.",
    pdfPath: "/samples/INFS1200/Cheat%20Sheet%20v2_removed.pdf",
    sections: [
      {
        heading: "Module 0 — DBMS fundamentals",
        content:
          "DBMS facilitates: Defining (types/structures/constraints for the data), Constructing (storing data on media controlled by the DBMS), Manipulating (querying/updating to reflect real-world changes), Sharing (simultaneous multi-user/program access). Components: Stored Database, DBMS, Applications, Users. Three-Schema Architecture — External level (per-user-community views), Conceptual level (whole-DB structure), Internal level (physical storage). Data Independence: Logical (change the conceptual schema without changing external views/applications), Physical (modify the physical schema without changing the conceptual schema).",
      },
      {
        heading: "Module 1 — ER modelling concepts",
        content:
          "Entity: a physical/conceptual object with attributes (can vary by system). Entity Type: name + attribute format. Entity Set: all entities of a type at a point in time (maps to a table). Key Attribute: unique identifier per entity; a composite key attribute is unique only as a whole. Value Set: allowed values for an attribute (can be NULL). Composite (divisible into sub-attributes) vs Simple (atomic); Multivalued (shown as double-lined ovals) vs Single. Relationship Type: association among ≥2 entities; Relationship Degree = Binary(2)/Ternary(3)/N-ary(3+). Entity Roles + Recursive Relationships (entity participates more than once under different roles). Relationship Set: the relationship instances at a point in time. Existence Dependency; Weak Entities (no own key — use owner's PK + partial key as composite PK) via an Identifying Relationship. Cardinality Ratio and Relationship Constraints limit valid entity combinations.",
      },
      {
        heading: "Module 2 — Relations & ER-to-Relational mapping (7+1 steps)",
        content:
          "A relation is a set of tuples (table). Relation Schema R[A1,...,An] has degree n; Relation Instance r(R) = {t1,...,tn}. Integrity constraints (violation conditions): Domain (value not in domain), Key (duplicate key value), Entity Integrity (part of PK is NULL), Referential Integrity (FK doesn't correctly reference a PK), Semantic Integrity (organisational policy violation). Insert/modify can violate all 5; delete can only violate Referential or Semantic. Mapping steps: (1) Entity — one relation per entity type, PK from a key attribute, include simple attributes. (2) Weak entity — PK = owner's PK + partial key, include FK to owner. (3) 1:1 — pick the entity type with total participation, add FK there to the other's PK, include the relationship's own simple attributes. (4) 1:N — FK goes on the N-side referencing the 1-side's PK; relationship's simple attributes go on the N-side. (5) M:N — new relation, FK to both entities' PKs, combined FKs form the PK. (6) Multivalued attribute — new relation, PK = the attribute + owner's PK (only the simple part if composite). (7) N-ary — new relation, FK to every participating entity's PK; combination of FKs from the many-cardinality sides forms the PK, plus any of the relationship's own attributes. (8) Super/subclass — new relation per subclass, subclass PK = superclass PK (also FK to the superclass relation), include the subclass's simple attributes. Do step 8 after step 1 or 2 if needed.",
      },
      {
        heading: "Module 4 — Functional dependencies & normalisation",
        content:
          "FD X→Y: any two tuples agreeing on X must agree on Y. Superkey: uniquely identifies tuples; Candidate Key: minimal superkey; Primary Key: the chosen candidate key. Prime attribute: in any candidate key. Finding keys: S is a key iff S+ = R and no proper subset S' has S'+ = R. Closure X+: start with X, repeatedly add the RHS of any FD whose LHS ⊆ X+, until stable. Transitive Dependency: X→Y via some Z that is neither a candidate key nor part of one, where X→Z and Z→Y both hold. Partial Dependency: X→Y still holds after removing an attribute from X. 1NF: no multivalued/nested attributes. 2NF: no partial dependencies (X not a proper subset of a candidate key, or Y is prime). 3NF: no partial or transitive dependencies (X is a superkey, or Y is prime). BCNF: X is a superkey for every non-trivial FD — strongest, but may not preserve every FD. BCNF decomposition: while a relation violates BCNF, find a violating FD X→Y and split into (R−Y) and (X∪Y); repeat per sub-relation. 3NF synthesis: compute the minimal cover, group FDs sharing an LHS into one relation each; add a relation of all prime attributes if a candidate key is missing; remove redundant relations. Minimal cover: (1) RHS simplification — one attribute per FD, (2) LHS simplification — drop redundant LHS attributes via a closure check, (3) remove any FD that's already implied by the rest. Dependency preservation: decomposition R1..Rn preserves F iff (F1∪...∪Fn)+ = F+.",
      },
      {
        heading: "Module 5 — Database security",
        content:
          "CIA threats: loss of Confidentiality/Integrity/Availability. Security = controlling access; Privacy = controlling how data about individuals is used — related but distinct, with an accessibility/security tradeoff. Control measures: Access Control (DAC/MAC/RBAC), Inference Control (protects against deducing individual data from statistical DBs), Flow Control (prevents info reaching unauthorised users), Encryption. DAC: grant/revoke privileges at Account level or Relation level; WITH GRANT OPTION lets a grantee re-grant; CASCADE (default) revokes downstream grants too. MAC (Bell-LaPadula): classifies subjects/objects into security classes — Simple Security Property (no read up), Star Property (no write down). DAC is flexible but doesn't control propagation; MAC is rigid but prevents flow. RBAC: privileges tied to organisational roles, usable alongside DAC/MAC. SQL Injection types: SQL Manipulation (altering WHERE conditions), Code Injection (extra statements), Function Call Injection (malicious DB/OS function calls). Risks: DB fingerprinting, denial of service, bypassing authentication, identifying injectable parameters, remote command execution, privilege escalation. Protections: bind variables/parameterised statements, input filtering/validation, restricting function access.",
      },
      {
        heading: "Module 3 — SQL",
        content:
          "Aggregation functions summarise a set of tuples (SELECT/HAVING). GROUP BY groups rows — every SELECT attribute must be grouped or aggregated. HAVING filters groups (the WHERE clause for GROUP BY). Equi-join (equality only) vs Theta-join (any comparison operator, on the cartesian product). Inner Join: only matching tuples from both relations. LEFT JOIN includes all first-table rows; RIGHT JOIN all second-table rows; FULL OUTER JOIN all rows from both (not implemented in MySQL). UNION/INTERSECT/DIFFERENCE(R1−R2) set operators. Non-correlated subquery: inner query runs once, independent of the outer query. Correlated subquery: inner query references the outer query's current row, evaluated once per outer tuple. Division (R1/R2): rows of R1 that pair with every row of R2 on the matching (division-compatible) columns — used for 'for all/every' queries.",
      },
    ],
  },
  {
    id: "infs1200-exam-notes",
    courseCode: "INFS1200",
    title: "INFS1200 Exam Notes",
    sourceNote: "Studocu-hosted notes with explicit relational mapping notation templates.",
    pdfPath: "/samples/INFS1200/Cheat%20Sheet.pdf",
    sections: [
      {
        heading: "Constraints (integrity violations)",
        content:
          "Domain constraint: attribute value not in its domain. Key constraint: inserted/modified tuple shares a key value with another (violates uniqueness). Entity Integrity: part of the PK is NULL (no part of a multi-attribute PK can be NULL). Referential Integrity: an operation leaves an FK reference invalid/broken — the referenced tuple must exist before any tuple that references it. Semantic Integrity: enforces organisational policy, typically via SQL triggers/assertions.",
      },
      {
        heading: "Keys & functional dependencies",
        content:
          "Candidate key: a minimal set of attributes uniquely identifying tuples — a relation can have many; every superkey contains at least one candidate key. Primary key: the chosen candidate key (underlined in the ERD). Foreign key: a referential key pointing to another relation's PK. Superkey: uniquely identifies the relation (no two tuples share these values). Prime/non-prime attribute: in any candidate key, or not. FD X→Y: Y's value depends on X's value in the relation.",
      },
      {
        heading: "Relational mapping notation templates",
        content:
          "Entity: E[a1,a2,a3]. Weak entity: E[a1,a2], W[a1,b2,b3] where W.a1 references E.a1. Binary 1:1: S[a1,a2], T[b1,b2,a1,c1] where T.a1 references S.a1 — the side with total participation stores the relationship's simple attributes plus the FK. Binary 1:N: S[a1,a2], T[b1,b2,a1,c2] where T.a1 references S.a1 — relationship's simple attributes go on the N-side relation, which also holds the FK. Recursive: Employee[SSN,fname,mlt,lname,dob,address,sex,salary,dnumber,superSSN] where Employee.superSSN references Employee.ssn (a self-referencing FK). Binary M:N: S[a1,a2], T[b1,b2], R[a1,b1,c1,c2] where R.a1 references S.a1 and R.b1 references T.b1 — a new relation is created for the relationship, and the combination of participating entities' PKs becomes its PK. Sparse relationship mapping: 1:1/1:N can also be mapped as if M:N, if fewer NULL FKs are wanted. N-ary relationship: mapped the same way as M:N. Multivalued attribute: mapped like a weak entity. Super/subclass: a relation per superclass and subclass; each subclass's PK equals the superclass PK, plus an FK from the subclass relation to the superclass relation; includes all non-composite, non-derived, non-multivalued simple attributes.",
      },
      {
        heading: "SQL joins vs set operations",
        content:
          "JOIN: combines data from multiple tables on a matched condition, into new columns; column counts/datatypes across tables don't need to match; returns duplicates by default. Set operations (UNION/INTERSECT/EXCEPT): combine results of multiple SELECTs into new rows; column counts and datatypes must match across the queries (union-compatible); return distinct rows by default (use ALL to keep duplicates). Recursive join example: SELECT A.name AS employee, A.salary AS employeeSalary, B.name AS manager, B.salary AS managerSalary FROM Employee A JOIN Employee B ON A.mgrSSN = B.ssn WHERE A.salary < B.salary.",
      },
      {
        heading: "Access control (DAC / MAC / RBAC)",
        content:
          "DAC: grant/revoke privileges (read/modify/reference tables); revoking cascades down the grant chain; an owner's grant-option holder can grant further privileges without the owner's direct knowledge. MAC: classifies data and users into security classes (Top Secret, Secret, Confidential, Unclassified) and enforces a security policy — core principle NRU (no read up), STAR property NWD (no write down). RBAC: roles carry preset DAC privileges or MAC security classes.",
      },
    ],
  },
  {
    id: "infs1200-review-note",
    courseCode: "INFS1200",
    title: "Review Note — Exam Notes Summary",
    sourceNote: "Includes worked DDL/DML/query examples and a full BCNF decomposition walkthrough — good reference for 'Sample examples' content.",
    pdfPath: "/samples/INFS1200/Review%20note.pdf",
    sections: [
      {
        heading: "DDL example — CREATE TABLE with composite key & multiple FKs",
        content:
          "CREATE TABLE ITEM (itemID INTEGER PRIMARY KEY, Category ENUM('x','y','z'), Colour VARCHAR(225), PRIMARY KEY (itemID));\n\nCREATE TABLE Sale (itemID INTEGER, custID INTEGER, timestamp TIMESTAMP, price DOUBLE(8,2), salesPerson VARCHAR(50), PRIMARY KEY (itemID, custID, timestamp), FOREIGN KEY (itemID) REFERENCES Item(itemID), FOREIGN KEY (custID) REFERENCES Cust(custID), FOREIGN KEY (salesPerson) REFERENCES Emp(SP));\n\nReminder: when writing CREATE TABLE, always check the schema and verify every FK reference.",
      },
      {
        heading: "DML syntax",
        content:
          "INSERT INTO <table> VALUES (v1, v2, ...); or INSERT INTO <table> (col1, col2, ...) VALUES (v1, v2, ...); — DELETE FROM <table> WHERE <condition>; — UPDATE <table> SET <column> = <value> [WHERE <condition>];",
      },
      {
        heading: "Pattern matching & filtering",
        content:
          "LIKE '%sin%' matches 0-or-more arbitrary characters (%) or exactly one character (_) — e.g. 'B%' names starting with B, '%B' ending in B, '%B%' containing B, '_____' names with exactly 5 characters. IN ('Germany','France','Japan') / NOT IN for multi-value WHERE filters. BETWEEN 120000 AND 150000 for ranges. Example: SELECT names, DOB FROM EMPLOYEE WHERE DOB < '1965-01-01'.",
      },
      {
        heading: "Complex joins & recursive joins",
        content:
          "Find the ids, names and characters of all movie stars who've been in 'Gone with the Wind': SELECT ms.name, s.starID, s.role FROM MovieStar ms JOIN StarsIn s ON ms.starID = s.starID JOIN Movie m ON s.movieID = m.movieID WHERE m.title LIKE 'Gone with the Wind'. Recursive join (employees earning less than their manager): SELECT A.name AS Employee, A.salary AS EmployeeSalary, B.name AS Manager, B.salary AS ManagerSalary FROM Employee A JOIN Employee B ON A.mgrSSN = B.ssn WHERE A.salary < B.salary.",
      },
      {
        heading: "Set operations — UNION / INTERSECT / EXCEPT",
        content:
          "Movies in 1944 or 1974 (UNION): two SELECTs for starID from Movie/StarsIn joined on year, combined with UNION (removes duplicates automatically — DISTINCT). Movies in both 1944 and 1974 (INTERSECT): join Movie to StarsIn twice with matching movieID, filtering year=1944 AND year=1974. Movies in 1944 but NOT in 1974 (EXCEPT/MINUS): SELECT starID ... WHERE year=1944 EXCEPT SELECT starID ... WHERE year=1974.",
      },
      {
        heading: "Nested & correlated subqueries",
        content:
          "Non-correlated (movies NOT in movieID 28): SELECT m.name, m.starID FROM MovieStar m WHERE m.starID NOT IN (SELECT s.starID FROM StarsIn s WHERE s.movieID = 28) — the inner query can be computed independently of the outer. Correlated (employees who work in a department managed by SSN=17): the inner query references the outer query's current department row, so it's evaluated once per outer tuple, not independently.",
      },
      {
        heading: "Views & role-based access",
        content:
          "CREATE VIEW DepEmpStatus AS SELECT sex, COUNT(*) AS EmployeeNum, dNumber, dName, AVG(salary) AS avgSalary FROM Department D JOIN Employee E ON D.dNumber = E.dNum GROUP BY dNum, sex; — then SELECT * FROM DepEmpStatus;. Role-based access: CREATE ROLE manager; DROP ROLE manager; GRANT privilegeName ON objectName TO {username|PUBLIC|roleName} [WITH GRANT OPTION]; REVOKE privilegeName ON objectName FROM {username|PUBLIC|roleName};. CREATE SCHEMA AUTHORIZATION owner creates a schema, its tables, and views, and can grant SELECT on a view to another user in one statement.",
      },
      {
        heading: "Worked example — BCNF decomposition",
        content:
          "Given R(A,B,C,D,E) with FDs {AB→CD, D→E, A→C, B→D}, decompose to BCNF: Step 1 — check {AB}+ = {A,B,C,D,E} = R, so AB is the candidate key; any FD whose LHS is not a superkey violates BCNF (D→E violates it, since D is not a superkey). Step 2 — split into R1 = {D}+ = {D,E} (FD D→E, key D, in BCNF) and R2 = R − {D}+ + D = {A,B,C,D} (FDs AB→CD, A→C — A→C still violates BCNF since A isn't a superkey of R2). Step 3 — repeat on R2: split into R3 = {A}+ within R2 = {A,C} (FD A→C, key A, BCNF) and R4 = R2 − {A,C} + A = {A,B,D} (FD AB→D, key AB, BCNF, but note B→D also needs checking — if present it violates BCNF and forces a further split into {B,D} and {A,B}). Final decomposition: relations whose FDs all satisfy BCNF (each LHS is a superkey of its own sub-relation).",
      },
    ],
  },
];

const SAMPLES_BY_COURSE: Record<string, SampleCheatsheet[]> = {
  INFS1200: INFS1200_SAMPLES,
};

export function getSampleCheatsheets(courseCode: string): SampleCheatsheet[] {
  return SAMPLES_BY_COURSE[courseCode.trim().toUpperCase()] ?? [];
}
