require 'js'

module RPGVXAceWeb
  module RGSSObjectLifecycle
    module_function

    def register_finalizer(owner, type, id)
      ObjectSpace.define_finalizer(owner, finalizer(type.to_s, id.to_i))
    end

    def collect
      GC.start
    rescue StandardError
      nil
    end

    def finalizer(type, id)
      proc do
        begin
          JS.global[:rubyBridge][:app].disposeObject(type, id)
        rescue StandardError
          nil
        end
      end
    end
  end
end
