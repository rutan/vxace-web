require 'js'
require 'zlib'

game_dir = JS.global[:rubyBridge][:gameDir].to_s
RPGVXAceWeb::Internal.game_dir = game_dir unless game_dir.empty? || game_dir == 'null' || game_dir == 'undefined'
game_id = JS.global[:rubyBridge][:gameId].to_s
RPGVXAceWeb::Internal.game_id = game_id unless game_id.empty? || game_id == 'null' || game_id == 'undefined'

ini = RPGVXAceWeb::Internal::IniFile.load
scripts_path = ini.read('Game', 'Scripts')
load_data(scripts_path).each do |item|
  code = Zlib.inflate(item.last)
  label = item[1].to_s
  JS.global[:rubyBridge][:rubyManager].pushNamed(label, code)
end
