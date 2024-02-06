import Vue from 'vue';
import { ExtendedVue } from 'vue/types/vue';

export default interface RichTextItem {
  id: string,
  component: string | ExtendedVue<Vue, any, any, any, any>,
  rootTagName?: string,
  text?: string,
  content?: any[],
  attrs?: any,
  rootElementAttributes?: any,
  rootElementId?: string,
  marks?: {
    type: 'link' | 'strike' | 'italic' | 'bold' | 'underline' | 'styled' | 'textStyle' | 'highlight' | 'code',
    attrs?: {
      href?: string,
      target?: '_blank' | '_current',
      class?: string,
      anchor?: string,
      color?: string
    }
  }[]

}
