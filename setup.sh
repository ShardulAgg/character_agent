#!/bin/bash

echo "Setting up TikTok Genie WebApp..."

# Create .env file from example
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your API keys"
fi

# Create necessary directories
mkdir -p uploads/images uploads/voices outputs

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Run backend: uvicorn backend.main:app --reload"
echo "3. Run frontend: streamlit run frontend/app.py"
echo ""
echo "Or use Docker:"
echo "docker-compose up --build"