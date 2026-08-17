import { useEffect, useState } from "react";
import { invokeSafe } from "../lib/ipc";

export interface ArticleOption {
	id: string;
	title: string;
}

export interface MapOption {
	id: string;
	title: string;
}

export interface CharacterSheetOption {
	id: string;
	name: string;
}

export interface GameSystemOption {
	id: string;
	name: string;
}

interface UseLinkableOptionsParams {
	/** Ognuna e opt-in: carica solo cio che il chiamante dichiara di volere. */
	articles?: boolean;
	maps?: boolean;
	characterSheets?: boolean;
	gameSystems?: boolean;
}

export function useLinkableOptions({
	articles = false,
	maps = false,
	characterSheets = false,
	gameSystems = false,
}: UseLinkableOptionsParams = {}) {
	const [articleOptions, setArticleOptions] = useState<ArticleOption[]>([]);
	const [mapOptions, setMapOptions] = useState<MapOption[]>([]);
	const [characterSheetOptions, setCharacterSheetOptions] = useState<CharacterSheetOption[]>([]);
	const [gameSystemOptions, setGameSystemOptions] = useState<GameSystemOption[]>([]);

	useEffect(() => {
		if (!articles) return;
		invokeSafe<ArticleOption[]>("get_all_articles").then((res) => {
			if (res) setArticleOptions(res.map((a) => ({ id: a.id, title: a.title })));
		});
	}, [articles]);

	useEffect(() => {
		if (!maps) return;
		invokeSafe<MapOption[]>("get_all_maps").then((res) => {
			if (res) setMapOptions(res.map((m) => ({ id: m.id, title: m.title })));
		});
	}, [maps]);

	useEffect(() => {
		if (!characterSheets) return;
		invokeSafe<CharacterSheetOption[]>("get_character_sheets").then((res) => {
			if (res) setCharacterSheetOptions(res.map((s) => ({ id: s.id, name: s.name })));
		});
	}, [characterSheets]);

	useEffect(() => {
		if (!gameSystems) return;
		invokeSafe<GameSystemOption[]>("get_all_game_systems").then((res) => {
			if (res) setGameSystemOptions(res);
		});
	}, [gameSystems]);

	return {
		articles: articleOptions,
		maps: mapOptions,
		characterSheets: characterSheetOptions,
		gameSystems: gameSystemOptions,
	};
}