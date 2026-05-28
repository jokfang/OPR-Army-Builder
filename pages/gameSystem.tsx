import { useDispatch } from 'react-redux'
import { setGameSystem } from '../data/armySlice'
import { useRouter } from 'next/router';
import { AppBar, IconButton, Paper, Toolbar, Typography } from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBackIosNew';
import { useEffect } from 'react';

export default function GameSystem() {

  const dispatch = useDispatch();
  const router = useRouter();
  const gameSystems = ["gf", "gff", "aof", "aofs"];
  const disabledGameSystems = ["gff", "aofs"];
  const isGameSystemDisabled = (gameSystem: string) => disabledGameSystems.includes(gameSystem);

  const selectGameSystem = (gameSystem: string) => {
    if (isGameSystemDisabled(gameSystem))
      return;

    dispatch(setGameSystem(gameSystem));
    router?.push({pathname: "/files", query: {...router.query, gameSystem: gameSystem}});
  };

  useEffect(() => {
    if (router.query) {
      //console.log(router.query)
      let gameSystem = router.query.gameSystem as string
      if (gameSystems.includes(gameSystem) && !isGameSystemDisabled(gameSystem)) selectGameSystem(gameSystem)
    } 
  }, [])

  return (
    <>
      <Paper elevation={2} color="primary" square>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={() => router.push("/")}
            >
              <BackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Create a new list
            </Typography>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
            >
            </IconButton>
          </Toolbar>
        </AppBar>
      </Paper>
      <div className="container">
        <div className="mx-auto p-4" style={{ maxWidth: "480px" }}>
          <h3 className="is-size-4 has-text-centered mb-4">Select Game System</h3>
          <div className="columns is-multiline is-mobile">
            {
              // For each game system
              gameSystems.map(gameSystem => {
                const disabled = isGameSystemDisabled(gameSystem);

                return (
                <div key={gameSystem} className="column is-half">
                  <Paper>
                    <img onClick={disabled ? undefined : () => selectGameSystem(gameSystem)} src={`img/${gameSystem}_cover.jpg`}
                      aria-disabled={disabled}
                      className={"game-system-tile "+ (disabled ? "" : "interactable")}
                      style={{
                        borderRadius: "4px",
                        display: "block",
                        filter: disabled ? "grayscale(95%)" : "none",
                        opacity: disabled ? 0.45 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                        pointerEvents: disabled ? "none" : "auto"
                      }} />
                  </Paper>
                </div>
              )})
            }
          </div>
        </div>

      </div>
    </>
  );
}
