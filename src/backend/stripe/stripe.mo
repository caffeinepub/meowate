import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import OutCall "../http-outcalls/outcall";

module {
  public type StripeConfiguration = {
    secretKey : Text;
    allowedCountries : [Text];
  };

  public type ShoppingItem = {
    currency : Text;
    productName : Text;
    productDescription : Text;
    priceInCents : Nat;
    quantity : Nat;
  };

  public func createCheckoutSession(configuration : StripeConfiguration, caller : Principal, items : [ShoppingItem], successUrl : Text, cancelUrl : Text, transform : OutCall.Transform) : async Text {
    let requestBody = buildCheckoutSessionBody(items, configuration.allowedCountries, successUrl, cancelUrl, ?Principal.toText(caller));
    try {
      await callStripe(configuration, "v1/checkout/sessions", #post, ?requestBody, transform);
    } catch (err) {
      Debug.trap("Failed to create checkout session: " # Error.message(err));
    };
  };

  public type StripeSessionStatus = {
    #failed : { error : Text };
    #completed : { response : Text; userPrincipal : ?Text };
  };

  public func getSessionStatus(configuration : StripeConfiguration, sessionId : Text, transform : OutCall.Transform) : async StripeSessionStatus {
    try {
      let reply = await callStripe(configuration, "v1/checkout/sessions/" # sessionId, #get, null, transform);
      if (Text.contains(reply, #text "\"error\"")) {
        #failed({ error = "Stripe API error" });
      } else {
        let extractedPrincipal = extractClientReferenceId(reply);
        #completed({ response = reply; userPrincipal = extractedPrincipal });
      };
    } catch (error) {
      #failed({ error = Error.message(error) });
    };
  };

  func callStripe(configuration : StripeConfiguration, endpoint : Text, method : { #get; #post }, body : ?Text, transform : OutCall.Transform) : async Text {
    var headers = [
      {
        name = "authorization";
        value = "Bearer " # configuration.secretKey;
      },
      {
        name = "content-type";
        value = if (method == #get) { "application/json" } else { "application/x-www-form-urlencoded" };
      }
    ];
    let url = "https://api.stripe.com/" # endpoint;
    switch (method) {
      case (#get) {
        switch (body) {
          case (?_) { Debug.trap("HTTP GET does not support a HTTP body") };
          case (null) {};
        };
        await OutCall.httpGetRequest(url, headers, transform);
      };
      case (#post) {
        let postBody = switch (body) {
          case (?rawBody) { rawBody };
          case (null) { Debug.trap("HTTP POST requires a HTTP body") };
        };
        await OutCall.httpPostRequest(url, headers, postBody, transform);
      };
    };
  };

  func urlEncode(text : Text) : Text {
    Text.replace(Text.replace(Text.replace(text, #char ' ', "%20"), #char '&', "%26"), #char '=', "%3D");
  };

  func buildCheckoutSessionBody(items : [ShoppingItem], allowedCountries : [Text], successUrl : Text, cancelUrl : Text, clientReferenceId : ?Text) : Text {
    let params = Buffer.Buffer<Text>(0);
    var index = 0;
    for (item in items.vals()) {
      let indexText = Nat.toText(index);
      params.add("line_items[" # indexText # "][price_data][currency]=" # urlEncode(item.currency));
      params.add("line_items[" # indexText # "][price_data][product_data][name]=" # urlEncode(item.productName));
      params.add("line_items[" # indexText # "][price_data][product_data][description]=" # urlEncode(item.productDescription));
      params.add("line_items[" # indexText # "][price_data][unit_amount]=" # Nat.toText(item.priceInCents));
      params.add("line_items[" # indexText # "][quantity]=" # Nat.toText(item.quantity));
      index += 1;
    };
    params.add("mode=payment");
    params.add("success_url=" # urlEncode(successUrl));
    params.add("cancel_url=" # urlEncode(cancelUrl));
    for (country in allowedCountries.vals()) {
      params.add("shipping_address_collection[allowed_countries][0]=" # urlEncode(country));
    };
    switch (clientReferenceId) {
      case (?id) { params.add("client_reference_id=" # urlEncode(id)) };
      case (null) {};
    };
    Text.join("&", params.vals());
  };

  func extractClientReferenceId(jsonText : Text) : ?Text {
    let patterns = ["\"client_reference_id\":\"", "\"client_reference_id\": \""];
    for (pattern in patterns.vals()) {
      if (Text.contains(jsonText, #text pattern)) {
        let parts = Text.split(jsonText, #text pattern);
        switch (parts.next()) {
          case (null) {};
          case (?_) {
            switch (parts.next()) {
              case (?afterPattern) {
                switch (Text.split(afterPattern, #text "\"").next()) {
                  case (?value) { if (Text.size(value) > 0) { return ?value } };
                  case (_) {};
                };
              };
              case (null) {};
            };
          };
        };
      };
    };
    null;
  };
};
