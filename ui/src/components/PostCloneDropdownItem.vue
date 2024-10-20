<script setup lang="ts">
import PostCloner from '@/class/postCloner';
import type { ListedPost } from '@halo-dev/api-client';
import { VDropdownItem } from '@halo-dev/components';
import { useQueryClient } from '@tanstack/vue-query';

const queryClient = useQueryClient();

const { post } = defineProps<{
  post: ListedPost;
}>();

async function handleClone() {
  await PostCloner.clonePost(post.post);

  // It may be that the index creation operation cannot obtain the new list in time.
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, 1000);
}
</script>
<template>
  <VDropdownItem @click="handleClone"> 克隆 </VDropdownItem>
</template>
