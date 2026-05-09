begin
  require 'js'
rescue LoadError
  # Native smoke scripts provide no JS bridge and only need class definitions.
end

module RPGVXAceWeb
  class << self
    def open_url(url)
      JS.global[:window].open(url.to_s)
      return nil
    end
  end
end
