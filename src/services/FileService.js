const path = require('path');
const uuid = require('uuid');
const fs = require('fs');
const filetype = require('file-type');
const { createCanvas } = require('canvas');
const sharp = require('sharp');
const { encode } = require('blurhash');



class FileService{

   static async  uploadAttachment(attachment){
      let extention;
      let mimetype;
      let compressedImage;
      let blurhash;
      try {
        const {ext, mime} = await filetype.fromBuffer(attachment);
        extention = ext;
        mimetype = mime;
      }
      catch(error) {
        console.log(error);
      }
      if (extention === undefined || mimetype === undefined) {
        extention = 'txt';
        mimetype = 'document';
      }
      const filename = uuid.v4() + `.${extention}`;
      const filepath = path.resolve(__dirname, '..', '..', 'media', filename);
      if (FileService.getFileType(mimetype) === 'image') {
         const info = await sharp(attachment).metadata();
         if (info.width > 1000) {
          compressedImage = await sharp(attachment).resize(1000).jpeg({quality: 80}).toBuffer();
         } else {
          compressedImage = await sharp(attachment).jpeg({quality: 80}).toBuffer();
         }
         const { data: hashblob, info: metadata } = await sharp(attachment)
         .resize(400)
         .jpeg({quality: 80})
         .raw()
         .ensureAlpha()
         .toBuffer({resolveWithObject: true});
         const clapmed = new Uint8ClampedArray(hashblob);
         blurhash = encode(clapmed, metadata.width, metadata.height, 4, 4);
      }
      if (compressedImage) {
        fs.writeFileSync(filepath, compressedImage);
      }
      else {
        fs.writeFileSync(filepath, attachment);
      }
      return [filename, FileService.getFileType(mimetype), blurhash];
   }

   static deleteAttachment(filename){
       fs.unlink(path.resolve(__dirname, '..', '..', 'media', filename), (error) => {
        console.log(error);
       });
   }

   static async uploadBlobData(blobfile){
     const info = await sharp(blobfile).metadata();
     const {data : hashblob, info: metadata} = await sharp(blobfile).resize(400).raw().ensureAlpha().toBuffer({resolveWithObject: true});
     const clapmed = new Uint8ClampedArray(hashblob);
     const blurhash = encode(clapmed, metadata.width, metadata.height, 4 ,4);
     const filename = uuid.v4() + '.jpeg';
     const filepath = path.resolve(__dirname, '..', '..', 'media', filename);
     let image;
     if (info.width > 1000) {
       image = await sharp(blobfile).resize(1000).jpeg({quality: 80}).toBuffer();
     } else {
       image = await sharp(blobfile).jpeg({quality: 80}).toBuffer();
     }
     fs.writeFileSync(filepath, image);
    return [filename, blurhash];
   }

   static generateUserAvatar(name, surname) {
    
    const canvas = createCanvas(); 

    const ctx = canvas.getContext('2d');

    const avatarSize = 200;

    const fontSize = avatarSize / 2;

    canvas.width = avatarSize;

    canvas.height = avatarSize;

    const bgColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    const textColor = getLuminance(bgColor) > 0.5 ? 'black' : 'white';

    ctx.beginPath();

    ctx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, 2 * Math.PI);
    
    ctx.fillStyle = bgColor;

    ctx.fill();

    ctx.font = fontSize + 'px Arial';

    ctx.textAlign = 'center';

    ctx.textBaseline = 'middle';

    ctx.fillStyle = textColor;

    const charUsername = name.charAt(0).toUpperCase() + surname.charAt(0).toUpperCase();

    ctx.fillText(charUsername, avatarSize / 2, avatarSize / 2);

    function getLuminance(color){
        const colorArray = colorToRGBArray(color);

        return ((0.2126 * colorArray[0] + 0.7152 * colorArray[1] + 0.0722 * colorArray[2]) / 255);
    }

    function colorToRGBArray(color){
        const canvas = createCanvas(avatarSize, avatarSize);

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;

        ctx.fillRect(0, 0, 1, 1);

        const data = ctx.getImageData(0, 0, 1, 1).data;

        return data.slice(0, 3);
    }
       
      const filename = uuid.v4() + '.jpg';

      const filepath = path.resolve(__dirname, '..', '..', 'media', filename);

      const buffer = canvas.toBuffer('image/jpeg');
       
      fs.writeFileSync(filepath, buffer);

      return filename;
   }

   static getFileType(mimeType) {
     if (mimeType.startsWith('image')) return 'image';
     if (mimeType.startsWith('video')) return 'video';
     if (mimeType.startsWith('audio')) return 'audio';
     return 'document';
   }
}

module.exports = FileService;