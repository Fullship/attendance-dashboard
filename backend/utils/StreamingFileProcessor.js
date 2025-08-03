const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');
const { promises: fsPromises } = require('fs');
const split = require('split2');
const path = require('path');

/**
 * Streaming File Processing Utilities
 * Replaces memory-intensive file operations with streaming alternatives
 */

class StreamingFileProcessor {
  /**
   * Process large files line by line without loading into memory
   * @param {string} filePath - Path to file
   * @param {Function} processor - Function to process each line
   * @returns {Promise<Array>} Processed results
   */
  static async processFileLines(filePath, processor = line => line) {
    const results = [];

    try {
      await pipeline(
        createReadStream(filePath),
        split(),
        new Transform({
          objectMode: true,
          transform(chunk, encoding, callback) {
            try {
              if (chunk.trim()) {
                const processed = processor(chunk.toString());
                if (processed !== null && processed !== undefined) {
                  this.push(processed);
                }
              }
              callback();
            } catch (error) {
              callback(error);
            }
          },
        }),
        new Transform({
          objectMode: true,
          transform(data, encoding, callback) {
            results.push(data);
            callback();
          },
        })
      );

      return results;
    } catch (error) {
      console.error('Streaming file processing error:', error);
      throw error;
    }
  }

  /**
   * Copy large files using streams
   * @param {string} source - Source file path
   * @param {string} destination - Destination file path
   */
  static async copyFile(source, destination) {
    try {
      await pipeline(createReadStream(source), createWriteStream(destination));
    } catch (error) {
      console.error('File copy error:', error);
      throw error;
    }
  }

  /**
   * Process CSV files with streaming for better memory usage
   * @param {string} filePath - Path to CSV file
   * @param {Function} processor - Function to process each record
   * @returns {Promise<Array>} Processed results
   */
  static async processCsvFile(filePath, processor = record => record) {
    const csv = require('csv-parser');
    const results = [];

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', data => {
          try {
            const processed = processor(data);
            if (processed !== null && processed !== undefined) {
              results.push(processed);
            }
          } catch (error) {
            reject(error);
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Write large data to file using streams
   * @param {string} filePath - Output file path
   * @param {Iterable} data - Data to write
   * @param {Function} formatter - Function to format each item
   */
  static async writeStreamingFile(filePath, data, formatter = item => JSON.stringify(item)) {
    const writeStream = createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      for (const item of data) {
        writeStream.write(formatter(item) + '\n');
      }

      writeStream.end();
    });
  }

  /**
   * Get file stats without reading entire file
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} File statistics
   */
  static async getFileStats(filePath) {
    try {
      const stats = await fsPromises.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      console.error('File stats error:', error);
      throw error;
    }
  }

  /**
   * Read file in chunks for processing
   * @param {string} filePath - Path to file
   * @param {number} chunkSize - Size of each chunk
   * @param {Function} processor - Function to process each chunk
   */
  static async processFileInChunks(filePath, chunkSize = 1024 * 1024, processor = chunk => chunk) {
    const results = [];
    const fileHandle = await fsPromises.open(filePath, 'r');

    try {
      let position = 0;
      const buffer = Buffer.allocUnsafe(chunkSize);

      while (true) {
        const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, position);

        if (bytesRead === 0) break; // End of file

        const chunk = buffer.subarray(0, bytesRead);
        const processed = await processor(chunk);

        if (processed !== null && processed !== undefined) {
          results.push(processed);
        }

        position += bytesRead;

        // Allow event loop to process other operations
        await new Promise(resolve => setImmediate(resolve));
      }

      return results;
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Safely check if file exists using async operations
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} Whether file exists
   */
  static async fileExists(filePath) {
    try {
      await fsPromises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory if it doesn't exist (async)
   * @param {string} dirPath - Directory path
   */
  static async ensureDirectory(dirPath) {
    try {
      await fsPromises.access(dirPath);
    } catch {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }
}

module.exports = StreamingFileProcessor;
