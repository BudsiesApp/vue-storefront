export default function getExtensionFromFileName (name: string): string | undefined {
  return name.split('.').pop();
}
