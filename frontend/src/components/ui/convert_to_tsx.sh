#!/bin/bash
# This script will help identify remaining .jsx files
for file in *.jsx; do
  if [ -f "$file" ]; then
    tsx_file="${file%.jsx}.tsx"
    if [ ! -f "$tsx_file" ]; then
      echo "$file needs conversion"
    fi
  fi
done
