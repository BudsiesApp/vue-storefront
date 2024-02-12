<template>
  <div
    class="storyblok-block layout-transparent-container"
    data-testid="storyblok-block"
    v-show="showBlock"
  >
    <sb-render
      v-for="(child) in itemData.body"
      :item="child"
      :key="child._uid"
      :parent-scope-id="scopeId"
      @content-change="onChildContentChange"
    />
  </div>
</template>

<script lang="ts">
import { BreakpointValue, InjectType } from 'src/modules/shared';
import { VueConstructor } from 'vue';

import BlockData from '../../types/block-data.interface';
import ComponentWidthCalculator from '../../component-width-calculator.service';
import EmptyChildrenState from '../../mixins/empty-children-state';

interface InjectedServices {
  componentWidthCalculator?: ComponentWidthCalculator
}

export default (EmptyChildrenState as VueConstructor<InstanceType<typeof EmptyChildrenState> & InjectedServices>).extend({
  name: 'Block',
  inject: {
    componentWidthCalculator: { default: undefined }
  } as unknown as InjectType<InjectedServices>,
  provide () {
    let widthCalculator = this.componentWidthCalculator;
    if (!widthCalculator) {
      widthCalculator = new ComponentWidthCalculator({
        xsmall: BreakpointValue.X_SMALL,
        small: BreakpointValue.SMALL,
        medium: BreakpointValue.MEDIUM,
        large: BreakpointValue.LARGE,
        xlarge: BreakpointValue.X_LARGE
      });
    }

    return {
      'componentWidthCalculator': widthCalculator
    }
  },
  computed: {
    itemData (): BlockData {
      return this.item as unknown as BlockData;
    },
    showBlock (): boolean {
      return !this.isAllChildrenEmpty;
    },
    scopeId (): string {
      return (this.$options as any)._scopeId;
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~@storefront-ui/shared/styles/helpers/breakpoints";
@import "./mixins";

.storyblok-block {
  @include storyblok-transparent-container-layout;
}
</style>
