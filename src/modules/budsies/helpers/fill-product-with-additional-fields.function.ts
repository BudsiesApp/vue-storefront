import { CustomizationStateItem } from 'src/modules/customization-system';
import { GiftCardOptions } from 'src/modules/gift-card';
import { CustomerImage } from 'src/modules/shared';

const ADDITIONAL_FIELDS_LIST = [
  {
    'type': 'string',
    'key': 'thumbnail'
  },
  {
    'type': 'string',
    'key': 'plushieId'
  },
  {
    'type': 'string',
    'key': 'email'
  },
  {
    'type': 'string',
    'key': 'plushieBreed'
  },
  {
    'type': 'string',
    'key': 'plushieName'
  },
  {
    'type': 'string',
    'key': 'plushieDescription'
  },
  {
    'type': 'string',
    'key': 'uploadMethod'
  },
  {
    'type': 'object',
    'key': 'bodyparts'
  },
  {
    'type': 'CustomerImage[]',
    'key': 'customerImages'
  },
  {
    'type': 'GiftCardOptions',
    'key': 'giftcard_options'
  },
  {
    'type': 'CustomizationStateItem[]',
    'key': 'customizationState'
  }
];

export default function fillProductWithAdditionalFields (
  {
    product,
    serverItem
  }: {
    product: Record<string, any>,
    serverItem: Record<string, any>
  }
): void {
  for (const field of ADDITIONAL_FIELDS_LIST) {
    if (!serverItem.hasOwnProperty(field.key) || !serverItem[field.key]) {
      continue;
    }

    let value = serverItem[field.key];

    switch (field.type) {
      case 'string':
        value = String(value);
        break;
      case 'object':
        value = value as object;
        break;
      case 'CustomerImage[]':
        value = value as CustomerImage[];
        break;
      case 'GiftCardOptions':
        value = value as GiftCardOptions;
        break;
      case 'CustomizationStateItem[]':
        value = (value as CustomizationStateItem[]).map((item) => {
          if (typeof item.value === 'number') {
            item.value = (item.value as number).toString();
          }

          return item;
        });
        break;
      default:
        throw new Error('Unsupported additional field type ');
    }

    product[field.key] = value;
  }
}
