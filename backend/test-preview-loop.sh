#!/bin/bash

# Test script to verify the preview loop fix

echo "Testing preview loop fix..."
echo "========================="
echo ""
echo "This test will:"
echo "1. Start the backend with debug logging"
echo "2. Monitor for 'All operations queued for preview' message"
echo "3. Verify that the backend returns a final response and doesn't continue looping"
echo ""
echo "Starting backend with debug logging..."
echo ""

# Run the backend with debug logging enabled
LOG_LEVEL=debug ./api 2>&1 | grep -E "(All operations queued|Queue check complete|Starting tool use round|Received response from provider|round|has_operations|all_queued|Returning final response)"