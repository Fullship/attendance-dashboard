const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');
const { promises: fsPromises } = require('fs');
const split = require('split2');

/**
 * Streaming JSON Processing Utilities
 * Replaces synchronous JSON operations with streaming alternatives
 */

class StreamingJsonProcessor {
  /**
   * Process large JSON files line by line without loading into memory
   * @param {string} filePath - Path to JSON file
   * @param {Function} processor - Function to process each JSON object
   * @returns {Promise<Array>} Processed results
   */
  static async processJsonFile(filePath, processor = data => data) {
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
                const data = JSON.parse(chunk);
                const processed = processor(data);
                this.push(processed);
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
      console.error('Streaming JSON processing error:', error);
      throw error;
    }
  }

  /**
   * Append JSON data to file without blocking
   * @param {string} filePath - Path to JSON file
   * @param {Object} data - Data to append
   */
  static async appendJsonLine(filePath, data) {
    const jsonLine = JSON.stringify(data) + '\n';
    await fsPromises.appendFile(filePath, jsonLine);
  }

  /**
   * Read existing JSON data from file using streaming
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<Array>} Parsed JSON data
   */
  static async readJsonFile(filePath) {
    try {
      await fsPromises.access(filePath);
      return await this.processJsonFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // File doesn't exist, return empty array
      }
      throw error;
    }
  }

  /**
   * Process large JSON arrays in chunks
   * @param {Array} data - Large array to process
   * @param {Function} processor - Processing function
   * @param {number} chunkSize - Size of each chunk
   * @returns {Promise<Array>} Processed results
   */
  static async processJsonArrayInChunks(data, processor, chunkSize = 1000) {
    const results = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const processed = await processor(chunk);
      results.push(...processed);

      // Allow event loop to process other operations
      await new Promise(resolve => setImmediate(resolve));
    }

    return results;
  }

  /**
   * Memory-efficient JSON stringify for large objects
   * @param {Object} data - Data to stringify
   * @param {string} filePath - Output file path
   */
  static async writeJsonToFile(data, filePath) {
    const writeStream = createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      // Write JSON in streaming fashion
      writeStream.write('[');

      let first = true;
      for (const item of data) {
        if (!first) writeStream.write(',');
        writeStream.write(JSON.stringify(item));
        first = false;
      }

      writeStream.write(']');
      writeStream.end();
    });
  }
}

module.exports = StreamingJsonProcessor;
