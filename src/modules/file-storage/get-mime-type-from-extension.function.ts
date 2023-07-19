const imagesExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'];

function formatExtension (extension: string): string {
  let formattedExtension = extension.toLocaleLowerCase();

  if (formattedExtension === 'jpg') {
    return 'jpeg';
  }

  if (formattedExtension === 'svg') {
    return 'svg+xml';
  }

  return formattedExtension;
}

export default function getMimeTypeFromExtension (extension: string | undefined): string {
  if (!extension) {
    return '';
  }

  const formattedExtension = formatExtension(extension);

  if (imagesExtensions.includes(formattedExtension)) {
    return `image/${formattedExtension}`;
  }

  return '';
}
