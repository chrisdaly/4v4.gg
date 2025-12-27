# 4v4.gg

## Ideas

Make the match background a gradient depending on the races?

## Next steps

Collect all 4v4 matches in game history
Put test data candlesticks up
Think about which is better:
do it per game,
do it per day and get all available

Candlestick chart
https://codepen.io/kryo2k/pen/pJxqBN

http://bl.ocks.org/andredumas/27c4a333b0e0813e093d

https://observablehq.com/@seanlaff/candlestick

## Destructing W3C data

- gateways
  - 20: europe
- gameMode
  - 4: 4v4
- Races:
  - 8: undead

## Resources

https://github.com/w3champions/website/tree/master/src/assets/TournamenBadges
https://observablehq.com/@irenedelatorre/wonderful-wednesday-april-2021-copd-app-data
https://observablehq.com/@d3/candlestick-chart

## Styles

- https://densitydesign.github.io/teaching-dd14/es02/group04/question01
- https://monkeytype.com/

## TODO

- player card

  - ~~country flags~~
  - ~~race~~
  - combine flags? https://fakeflag.net/

- stream version

  - ~~compact~~
  - transparent background?

- time series

  - record last 15 mins, plot graph of games and players?

- match

  - how long it has been going

- Range plot for MMR

  - stutter close dots
  - better axis annotation
  - additional plot with all game mmr on it? Box plot?
  - sparkline plot? (form for last 10 games?)

- Render a historical Game id
- Select game by player
- Select game by id

Where to include game id and date?

Search bar for player and game id,
Summary of different lobby types
Breakdown of player/team cards and assignment of lobbies (standard deviation)

## Improvements

utilise public folder in "player.js" like i did in "playerprofile.js" - seems the proper way to do it
google translate account names?

Check if there's a way around ws being insecure for num in queue
Visualization for how many in game, how many searching, how many recently finished
~~Add headers in navbar for home, player, queue~~
~~Add a match page~~
add line chart for RP/MMR gain
add ping information

add standard deviation to team header, transition

## Ideas

Add a feature to vote on who you think will win
Add a feature to vote on post game MVP

# TODO new

order races so that they are easier to compare
draw a line between AT partners
do a ongoing match view, that's also suitable for stream
upscale race icons
add gold circle to mmr trend

export NODE_OPTIONS=--openssl-legacy-provider
