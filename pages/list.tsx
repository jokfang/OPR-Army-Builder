import Head from "next/head";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../data/store'
import { useRouter } from "next/router";
import { useMediaQuery } from 'react-responsive';
import MobileView from "../views/listBuilder/MobileView";
import DesktopView from "../views/listBuilder/DesktopView";
import { setGameRules } from "../data/armySlice";
import DictionaryService from "../services/DictionaryService";

export default function List() {

  const army = useSelector((state: RootState) => state.army);
  const router = useRouter();
  const dispatch = useDispatch();

  const [competitive, setCompetitive] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Load army list file 
  useEffect(() => {
    // Redirect to game selection screen if no army selected
    if (!army.loaded) {
      router.push({pathname: "gameSystem/", query: router.query}, null, { shallow: true });
      return;
    }

    // Load common rule definitions
    DictionaryService.getRules()
      .then(rules => {
        dispatch(setGameRules(rules));
      }, err => {
        console.error("Failed to load rules dictionary:", err);
        dispatch(setGameRules([]));
      });
  }, []);

  // Break from mobile to desktop layout at 1024px wide
  const isBigScreen = useMediaQuery({ query: '(min-width: 1024px)' });

  return (
    <>
      <Head>
        <title>OPR Army Forge</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {army.loaded ? (isBigScreen ? <DesktopView competitive={competitive} setCompetitive={setCompetitive} /> : <MobileView competitive={competitive} setCompetitive={setCompetitive} />) : null}
    </>
  );
}
