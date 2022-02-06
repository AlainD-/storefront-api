#!/bin/bash
if [ -f "storefront-api.zip" ]; then
  eb deploy
fi
