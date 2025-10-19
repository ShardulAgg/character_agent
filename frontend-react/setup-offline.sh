#!/bin/bash

echo "🔧 Offline React Setup Script"
echo "This script creates a basic React setup without npm install"

# Create basic node_modules structure manually
mkdir -p node_modules/.bin

# Create a minimal vite.config.ts that works without dependencies
cat > vite.config.basic.ts << 'EOF'
export default {
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000, 
    host: true,
  },
}
EOF

# Create a basic HTML file that loads React from CDN
cat > index-cdn.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TikTok Genie - AI Image & Voice Processing</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel" src="./src/main-cdn.jsx"></script>
  </body>
</html>
EOF

echo "✅ Created offline development files"
echo "📝 Next steps:"
echo "1. Try connecting to a different network"
echo "2. Contact IT for proxy settings" 
echo "3. Use index-cdn.html for CDN-based development"