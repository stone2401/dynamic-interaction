
build:
	pnpm run build

link:
	pnpm run build
	npm link

start:
	pnpm run build
	node dist/src/cli.js