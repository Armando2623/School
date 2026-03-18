const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const destPath = path.join(__dirname, 'src', 'js', 'env.js');

let envConfig = {};

if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
        if (match) {
            envConfig[match[1].trim()] = match[2].trim();
        }
    });
    console.log('✅ Archivo .env cargado exitosamente.');
}

const content = `// Exportación de variables de entorno al navegador\nwindow.ENV = ${JSON.stringify(envConfig, null, 2)};\n`;

fs.writeFileSync(destPath, content);
