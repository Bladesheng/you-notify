<script setup lang="ts">
import { useQuasar } from 'quasar';

const $q = useQuasar();
</script>

<template>
	<div class="popup">
		<header>
			<img src="icons/favicon-48x48.png" />

			<h1 class="text-h4">YouNotify</h1>

			<q-btn round color="secondary" icon="settings" to="/options" target="_blank" />
		</header>

		<main></main>
	</div>
</template>

<style scoped>
.popup {
	padding: 1rem;
}

header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 2rem;
}
</style>
