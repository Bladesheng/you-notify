<script setup lang="ts"></script>

<template>
	<footer>
		<small class="flex items-center">
			Made by
			<a href="https://github.com/Bladesheng/you-notify" target="_blank" class="flex items-center">
				<img src="github-mark.svg" class="q-mx-xs" alt="github-mark" />

				<span class="text-primary">Bladesheng</span>
			</a>
		</small>
	</footer>
</template>

<style scoped lang="scss">
small {
	img {
		height: 1rem;
		transition: transform 1s;
	}

	a {
		text-decoration: none;

		&:hover {
			img {
				transition: transform 2s;
				transform: rotate(720deg);
			}
		}
	}
}
</style>
