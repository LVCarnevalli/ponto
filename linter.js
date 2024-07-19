const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");

// Função para substituir palavras com base em um arquivo de configuração
function replaceWords(content, replacements) {
  let updatedContent = content;
  for (const [before, after] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${before}\\b`, "gi");
    updatedContent = updatedContent.replace(regex, after);
  }
  return updatedContent;
}

// Função para extrair o título do markdown
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

// Função para extrair a descrição do markdown
function extractDescription(content) {
  const match = content.match(/```text([\s\S]*?)```/);
  if (match) {
    return match[1]
      .replace(/\(\d+x\)/g, "") // Remove (1x), (2x), (3x)
      .replace(/[\r\n]+/g, " ") // Substitui quebras de linha (incluindo \r e \n) por espaço
      .replace(/\s{2,}/g, " ") // Substitui múltiplos espaços por um único espaço
      .replace(/"/g, "") // Substitui aspas duplas
      .trim(); // Remove espaços em branco no início e no fim
  }
  return "";
}

// Função para transformar o título, incluindo remoção de acentos
function transformTitle(title) {
  return title
    .toLowerCase()
    .normalize("NFD") // Normaliza a string em decomposição
    .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos (acentos)
    .replace(/[^\w\s]/gi, "") // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-"); // Substitui espaços por traços
}

// Função para modificar o frontmatter do markdown
function updateFrontmatter(frontmatter, title, description) {
  // Remove title e description existentes
  let updatedFrontmatter = frontmatter
    .replace(/^\s*title:\s.*$/m, "")
    .replace(/^\s*description:\s.*$/m, "");

  // Remove linhas em branco extras
  updatedFrontmatter = updatedFrontmatter
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  // Adiciona title e description acima de tags
  const tagPosition = updatedFrontmatter.indexOf("tags:");
  const newFrontmatter = [
    updatedFrontmatter.slice(0, tagPosition).trim(),
    `title: "${title}"`,
    `description: "${description}"`,
    updatedFrontmatter.slice(tagPosition).trim(),
  ].join("\n");

  return `---
${newFrontmatter.trim()}
---`;
}

function checkForUnexpectedParentheses(filename, content) {
  // Regex para encontrar qualquer parêntese
  const allParenthesesRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = allParenthesesRegex.exec(content)) !== null) {
    const value = match[1];
    // Regex para encontrar padrões válidos como (1x), (2x), (3x), etc.
    const validPatternRegex = /^\d+x$/;
    if (!validPatternRegex.test(value)) {
      console.warn(
        `Alerta: Encontrado parênteses inesperado "(${value})" no arquivo ${filename}`
      );
    }
  }
}

async function processFiles() {
  const directory = "docs";
  const replacementsFile = "replacements.json";
  const replacements = JSON.parse(await fs.readFile(replacementsFile, "utf8"));
  const files = glob.sync(`${directory}/**/*.mdx`);

  for (const file of files) {
    let content = await fs.readFile(file, "utf8");

    // Divida o conteúdo em frontmatter e o restante
    const frontmatterMatch = content.match(/^---[\s\S]*?---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[0].slice(3, -3).trim();
      let markdownContent = content.slice(frontmatterMatch[0].length).trim();
      markdownContent = replaceWords(markdownContent, replacements);

      // Atualize o frontmatter
      const title = extractTitle(markdownContent);
      const description = extractDescription(markdownContent);
      const updatedFrontmatter = updateFrontmatter(
        frontmatter,
        title,
        description
      );

      // Recombine frontmatter atualizado com o conteúdo markdown
      content = `${updatedFrontmatter}\n\n${markdownContent}`;
    }

    const title = extractTitle(content);
    const newFilename = transformTitle(title);
    const newFilePath = path.join(path.dirname(file), `${newFilename}.mdx`);
    await fs.writeFile(newFilePath, content);
    if (newFilePath !== file) {
      await fs.remove(file);
    }

    checkForUnexpectedParentheses(newFilePath, content);
  }
}

processFiles().catch((err) => {
  console.error("Unexpected error: ", err);
});
