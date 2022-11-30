import ObjectBuilderInterface from '../types/object-builder.interface';
import BulkorderQuote from '../models/bulkorder-quote.model';
import BulkorderQuoteApiResponse from '../models/bulkorder-quote-api-response.interface';

const factory: ObjectBuilderInterface<BulkorderQuote, BulkorderQuoteApiResponse> = (data) => {
  const value = new BulkorderQuote(
    +data.id,
    +data.bulkorder_id,
    +data.qty,
    +data.production_price,
    +data.shipping_price,
    data.production_time ? +data.production_time : data.production_time
  );

  return value;
}

export default factory;
