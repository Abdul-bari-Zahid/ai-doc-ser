import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { analyzeReportImage } from './utils/gemini.js';

async function main(){
  try{
    console.log('GEMINI_API_KEY present?', !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY));
    let buffer;
    try {
      const url = 'https://via.placeholder.com/300';
      console.log('Downloading test image from', url);
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      buffer = Buffer.from(res.data);
      console.log('Downloaded image size:', buffer.length);
    } catch (downloadErr) {
      console.warn('Could not download remote image, using embedded 1x1 PNG fallback. Error:', downloadErr.message);
      // 1x1 transparent PNG
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9N9ebwAAAABJRU5ErkJggg==';
      // if online download fails, create a synthetic (non-image) buffer >100 bytes so we can test error handling
      buffer = Buffer.from('A'.repeat(1024));
      console.log('Using synthetic fallback buffer size:', buffer.length);
    }

    const result = await analyzeReportImage(buffer, 'image/png');
    console.log('\n=== AI RESULT ===\n', result);
  }catch(err){
    console.error('Test script error:', err);
  }
}

main();
