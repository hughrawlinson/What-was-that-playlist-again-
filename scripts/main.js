/* eslint-env browser */
/* globals React ReactDOM fetch window document localStorage */
(function main() {
  const queryParams = window.location.hash.substr(1).split('&').map(e => e.split('=')).reduce((acc, e) => {
    const obj = {};
    obj[e[0]] = e[1];
    return Object.assign({}, acc, obj);
  }, {});
  window.location.hash = '';

  const authEndpoint = 'https://accounts.spotify.com/authorize';
  const mePlaylistsEndpoint = 'https://api.spotify.com/v1/me/playlists';
  const recentlyPlayedEndpoint = 'https://api.spotify.com/v1/me/player/recently-played';
  const startPlaybackEndpoint = 'https://api.spotify.com/v1/me/player/play';
  const audioAnalysisEndpoint = 'https://api.spotify.com/v1/audio-analysis/';
  const seekPositionEndpoint = 'https://api.spotify.com/v1/me/player/seek';
  const stopEndpoint = 'https://api.spotify.com/v1/me/player/pause';
  const getSeveralArtistsEndpoint = 'https://api.spotify.com/v1/artists';
  const getSeveralAlbumsEndpoint = 'https://api.spotify.com/v1/albums';

  document.querySelector('#spotifyLogin').addEventListener('click', () => {
    const clientId = '7cacd90e9b7446059b8225b5f32d01c6';
    const redirectUri = window.location.href.split('#')[0];
    const scopes = [
      'user-read-recently-played',
    ];
    window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&response_type=token`;
  });

  if (queryParams.access_token) {
    const time = new Date();
    localStorage.setItem('token', queryParams.access_token);
    localStorage.setItem('expires_at', JSON.stringify(time.setSeconds(time.getSeconds() + parseInt(queryParams.expires_in, 10))));
  }

  if (localStorage.getItem('token')) {
    const token = localStorage.getItem('token');

    document.querySelector('#navbarButton').addEventListener('click', (e) => {
      e.preventDefault();
      // Do something
    });

    const PlaylistThumbnail = props => React.createElement('div', {
      className: 'col-sm-6 col-md-4',
      key: `playlistThumbnailDiv${props.id}`,
    }, [
      React.createElement('div', {
        className: 'thumbnail',
        key: `playlistThumbnailDivThumbnailClass${props.id}`,
      }, [
        React.createElement('img', {
          src: props.images[0] ? props.images[0].url : '',
          className: 'img-responsive',
          key: `playlistCoverImage${props.id}`,
          style: {
            width: 350,
            height: 350,
          },
          alt: `${props.name} Playlist Album Cover`,
        }, null),
        React.createElement('div', {
          className: 'caption',
          key: `div${props.id}`,
        }, [
          React.createElement('h3', {
            key: `h3${props.id}`,
            style: {
              maxHeight: '1.2em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }, props.name),
          React.createElement('p', {
            key: `p${props.id}`,
          }, React.createElement('a', {
            className: 'btn btn-stroked-dark',
            role: 'button',
            target: '_blank',
            href: props.external_urls.spotify,
            key: `a${props.id}`,
          }, 'Open in Spotify')),
        ]),
      ]),
    ]);

    PlaylistThumbnail.propTypes = {
      id: React.PropTypes.string,
      name: React.PropTypes.string,
      images: React.PropTypes.arrayOf({
        href: React.PropTypes.string,
      }),
      tracks: React.PropTypes.arrayOf({
        href: React.PropTypes.string,
      }),
    };

    fetch(`${recentlyPlayedEndpoint}?limit=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(response => response.json()).then((data) => {
      window.data = data;
      const partiallyAppliedContextExtractors = ['playlist','artist','album'].map(contextType => ((data) =>
        data.items
          .filter(e => e.context && e.context.type === contextType)
          .map(e => e.context.uri)
          .filter((item, pos, self) => self.indexOf(item) == pos)
      ))
      const contexts = partiallyAppliedContextExtractors.map(e => e(data));
      // Assumption: each URI in the array is of the same type
      const getAllUris = uris => uris[0] ? (uri =>
          uri == 'artist' ?
            `${getSeveralArtistsEndpoint}?ids=${uris.map(e=>e.split(':')[2]).join(',')}` :
            uri == 'album' ?
              `${getSeveralAlbumsEndpoint}?ids=${uris.map(e=>e.split(':')[2]).join(',')}` :
              uris.map(e =>
                (
                  uriComponents => (
                    (user,playlistId) => `https://api.spotify.com/v1/users/${user}/playlists/${playlistId}`
                  )(uriComponents[2],uriComponents[4])
                )(e.split(':'))
              )
          )(uris[0].split(':')[1]) : []

      Promise.all(contexts.map(getAllUris).map(contextType =>
        typeof contextType === 'string' ?
          fetch(contextType, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }).then(e => e.json()) :
          Promise.all(contextType.map(url =>
            fetch(url, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }).then(e => e.json())
          ))
      )).then(data => {
        ReactDOM.render(React.createElement('div', null, data
          .map(d => d.artists || d)
          .map(d => d.albums || d)
          .map(d => {
            if (d && d[0]) {
              return React.createElement('div', {className: "row"},
                React.createElement('div', {className: 'col-xs-12'}, [
                  React.createElement('h1', null, `${(uri => uri == 'artist' ? 'Artists' : uri == 'album' ? 'Albums' : 'Playlists')(d[0].type)}`),
                  React.createElement('div', {className: "row"}, d.map(el => React.createElement(PlaylistThumbnail, el))),
                  React.createElement('hr')
                ])
              );
            }
          })
        ), document.getElementById('root'));
      });
    });
  } else {
    // Something bad has happened, but we no-console
    // console.log('no token');
  }
}());
