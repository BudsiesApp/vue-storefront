import ObjectBuilderInterface from '../types/object-builder.interface';
import RushAddon from '../models/rush-addon.model';
import RushAddonApiResponse from '../models/rush-addon-api-response.interface';

const factory: ObjectBuilderInterface<RushAddon, RushAddonApiResponse> = (data) => {
  const value = new RushAddon(
    data.sku,
    data.text,
    +data.price,
    +data.turnaround_time,
    false,
    data.slots_left,
    Boolean(data.is_domestic),
    Boolean(data.is_in_time_for_christmas)
  );

  return value;
}

export default factory;
