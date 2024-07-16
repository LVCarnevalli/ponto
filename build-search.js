const fs = require("fs");
const path = require("path");
const recursive = require("recursive-readdir");
const matter = require("gray-matter");

const inputDir = path.join(__dirname, "docs/");
const outputFile = path.join(__dirname, "static/search-data.json");

function extractData(fileContent) {
  const { data, content } = matter(fileContent);
  const titleMatch = content.match(/#\s(.+)\n/);
  const letraMatch = content.match(/### Letra\n\n```text\n([\s\S]*?)```/);
  const title = titleMatch ? titleMatch[1] : null;
  const lyrics = letraMatch ? letraMatch[1].trim() : null;
  if (title && lyrics) {
    return {
      title,
      lyrics,
      tags: data.tags || [],
    };
  }

  return null;
}

async function processFiles() {
  try {
    const files = await recursive(inputDir, [
      (file, stats) =>
        !stats.isDirectory() && !file.endsWith(".md") && !file.endsWith(".mdx"),
    ]);
    const results = [];

    for (const file of files) {
      const relativeFilePath = path.relative(inputDir, file);
      const url =
        "https://umbandaponto.com/" +
        relativeFilePath
          .replace(path.extname(relativeFilePath), "")
          .replace("\\", "/");

      const fileContent = fs.readFileSync(file, "utf8");
      const data = extractData(fileContent);
      if (data) {
        results.push({ url, ...data });
      }
    }

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("unexpected error", error);
  }
}

processFiles();
