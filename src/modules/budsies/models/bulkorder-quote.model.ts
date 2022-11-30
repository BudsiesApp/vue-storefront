export default class BulkorderQuote {
  public constructor (
    public readonly id: number,
    public readonly bulkorderId: number,
    public readonly qty: number,
    public readonly productionPrice: number,
    public readonly shippingPrice: number,
    public readonly productionTime: number | undefined = undefined,
    public readonly isNew = true
  ) {
    [id, bulkorderId, qty, productionPrice, shippingPrice, isNew].forEach((arg, index) => {
      if (arg === undefined) {
        throw new Error(`Undefined value passed at position: ${index}`);
      }
    });
  }
}
