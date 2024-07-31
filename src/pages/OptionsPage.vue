<script setup lang="ts">
import { useQuasar } from 'quasar';
import { ref } from 'vue';

const $q = useQuasar();

$q.bex.on('xx', (e) => {
	console.log('xx', e);
});

async function saveSettings() {
	const res = await $q.bex.send('settingsSaved', {
		token: token.value,
		youTrackUrl: url.value,
	});
}

const token = ref('');
const url = ref('');
</script>

<template>
	<q-input v-model="token" label="YouTrack Token" />

	<q-input v-model="url" label="YouTrack URL" />

	<q-btn @click="saveSettings()" color="primary" label="Save" />
</template>

<style scoped></style>
