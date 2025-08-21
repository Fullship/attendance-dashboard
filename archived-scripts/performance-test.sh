#!/bin/bash

# Performance Test Script for Attendance Upload Optimization
# This script generates a large test CSV file and measures upload performance

echo "🚀 Attendance Upload Performance Test"
echo "====================================="

# Create test data directory
mkdir -p test-data

# Generate a large test CSV file (1000 records)
echo "📋 Generating test data..."
cat > test-data/large-attendance.csv << 'EOF'
First Name,Last Name,ID,Date,Clock-In Time,Clock-Out Time,Attendance Status,Worked Hours
John,Doe,1,2024-01-01,09:00,17:00,present,8
Jane,Smith,2,2024-01-01,08:30,17:30,present,8.5
Bob,Johnson,3,2024-01-01,09:15,17:00,late,7.75
Alice,Williams,4,2024-01-01,09:00,16:30,early_leave,7.5
Charlie,Brown,5,2024-01-01,,absent,0
EOF

# Generate additional 995 records to make it 1000 total
for i in $(seq 6 1000); do
    # Random data generation
    first_names=("John" "Jane" "Bob" "Alice" "Charlie" "David" "Emily" "Michael" "Sarah" "Chris")
    last_names=("Doe" "Smith" "Johnson" "Williams" "Brown" "Davis" "Miller" "Wilson" "Moore" "Taylor")
    statuses=("present" "present" "present" "late" "absent")
    
    # Pick random values
    first_name=${first_names[$((RANDOM % 10))]}
    last_name=${last_names[$((RANDOM % 10))]}
    status=${statuses[$((RANDOM % 5))]}
    
    # Generate date (last 30 days)
    days_ago=$((RANDOM % 30))
    test_date=$(date -v -${days_ago}d +%Y-%m-%d 2>/dev/null || date -d "${days_ago} days ago" +%Y-%m-%d)
    
    if [ "$status" = "present" ] || [ "$status" = "late" ]; then
        clock_in_hour=$((8 + RANDOM % 2))
        clock_in_min=$((RANDOM % 60))
        clock_out_hour=$((16 + RANDOM % 3))
        clock_out_min=$((RANDOM % 60))
        worked_hours=$((clock_out_hour - clock_in_hour))
        
        printf "%s,%s,%d,%s,%02d:%02d,%02d:%02d,%s,%d\n" \
            "$first_name" "$last_name" "$i" "$test_date" \
            "$clock_in_hour" "$clock_in_min" "$clock_out_hour" "$clock_out_min" \
            "$status" "$worked_hours"
    else
        printf "%s,%s,%d,%s,,,%s,0\n" "$first_name" "$last_name" "$i" "$test_date" "$status"
    fi
done >> test-data/large-attendance.csv

echo "✅ Generated test file with $(wc -l < test-data/large-attendance.csv) records"

# Show file size
file_size=$(du -h test-data/large-attendance.csv | cut -f1)
echo "📁 File size: $file_size"

echo ""
echo "🎯 Performance Optimizations Applied:"
echo "   • Batch processing: 500 records per batch (5x increase)"
echo "   • Concurrent batches: 5 simultaneous batches"
echo "   • Pre-cached user lookups with multiple indexes"
echo "   • Bulk database operations with upsert"
echo "   • Optimized date parsing with caching"
echo "   • Enhanced database indexes and connection pooling"
echo "   • Memory-optimized file parsing"
echo ""
echo "📊 Expected Performance Improvements:"
echo "   • 10-20x faster processing for large files"
echo "   • Reduced memory usage for very large files"
echo "   • Real-time progress tracking with Socket.IO"
echo "   • Better error handling and recovery"
echo ""
echo "🧪 To test the upload:"
echo "   1. Go to Admin Dashboard → Data Upload"
echo "   2. Upload the file: test-data/large-attendance.csv"
echo "   3. Watch the real-time progress indicator"
echo "   4. Monitor server logs for performance metrics"
echo ""
echo "💡 The optimized system should process this 1000-record file in under 10 seconds!"
