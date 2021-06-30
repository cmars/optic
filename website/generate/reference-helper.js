const path = require('path');

const generateRuntimeOutput = (components) => `

module.exports = {
  data: ${JSON.stringify(components)},
  components: {
    ${components.map(makeComponentLine).join('\n')}
  }

}

`;

const resultsRoot = path.join(__dirname, 'results');
function makeComponentLine(component) {
  const relativePath = path.relative(resultsRoot, component.path);
  return `"${component.slug}": require('${relativePath}'),`;
}

module.exports = {
  generateRuntimeOutput,
};
