const { writeFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
require("dotenv").config();

const SHEET_ID = process.env.SHEET_ID;

const generateMDContent = (categoria, title, letra, link) => {
  return `---
hide_table_of_contents: true
tags:
  - ${categoria}
---

# ${title}

### Letra

\`\`\`text
${letra}
\`\`\`

### Youtube

<iframe
  width="200"
  height="200"
  src="${link.replace("/watch?v=", "/embed/")}"
  title="YouTube video player"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>
`;
};

const createMDFile = (fileName, category, content) => {
  const dir = join(__dirname, `docs/${category}`);
  if (!existsSync(dir)) {
    mkdirSync(dir);
  }
  writeFileSync(join(dir, `${fileName}.mdx`), content);
};

const readSheet = async () => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  const data = await fetch(url)
    .then((res) => res.text())
    .then((text) => JSON.parse(text.substr(47).slice(0, -2)));

  return data.table.rows
    .map((row) => [
      ...data.table.cols.map((col, index) => ({
        [col.label.trim()]: row.c[index].v,
      })),
    ])
    .map((data) => data.reduce((acc, value) => ({ ...acc, ...value }), {}));
};

const formatFileName = (title) => {
  const from = "áàãâäéèêëíìîïóòõôöúùûüñçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÑÇ";
  const to = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC";
  const mapping = {};

  for (let i = 0; i < from.length; i++) {
    mapping[from.charAt(i)] = to.charAt(i);
  }

  const removeAccents = (str) => {
    return str
      .split("")
      .map((char) => mapping[char] || char)
      .join("");
  };

  return removeAccents(title).replace(/\s+/g, "-").toLowerCase();
};

(async () => {
  const sheet = await readSheet();
  for (const row of sheet) {
    const category = row["Categoria"];
    const title = row["Título"];
    const lyric = row["Letra"];
    const link = row["Youtube (apenas um vídeo)"];

    const content = generateMDContent(category, title, lyric, link);
    const fileName = formatFileName(title);

    try {
      createMDFile(fileName, category, content);
      console.log(`${fileName} created`);
    } catch (error) {
      console.error(`${fileName} unexpected error`, error);
    }
  }
})();
