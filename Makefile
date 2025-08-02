
build:
	pnpm run build

build-electron:
	pnpm run build:electron

link:
	pnpm run build
	npm link

start:
	pnpm run build
	node dist/src/cli.js

start-electron:
	pnpm run build
	pnpm run start:electron