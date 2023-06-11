using Microsoft.AspNetCore.ApiAuthorization.IdentityServer;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace ChattR.Controllers
{
    public class OidcConfigurationController : Controller
    {
        private readonly ILogger<OidcConfigurationController> _logger;
        IAuthenticationSchemeProvider _authenticationSchemeProvider;

        public OidcConfigurationController(IClientRequestParametersProvider clientRequestParametersProvider, ILogger<OidcConfigurationController> logger, IAuthenticationSchemeProvider pr)
        {
            ClientRequestParametersProvider = clientRequestParametersProvider;
            _logger = logger;
            _authenticationSchemeProvider = pr;
            //Index().Wait();


        }

        public async Task<IActionResult> Index()
        {

            //var result = await HttpContext.AuthenticateAsync();
            //var r = result.Ticket.AuthenticationScheme;
            var r1 = await _authenticationSchemeProvider.GetRequestHandlerSchemesAsync();
            var r2 = await _authenticationSchemeProvider.GetDefaultAuthenticateSchemeAsync();
            var r3 = await _authenticationSchemeProvider.GetAllSchemesAsync();

            return View();
        }

        public IClientRequestParametersProvider ClientRequestParametersProvider { get; }

        [HttpGet("_configuration/{clientId}")]
        public IActionResult GetClientRequestParameters([FromRoute] string clientId)
        {
            var parameters = ClientRequestParametersProvider.GetClientParameters(HttpContext, clientId);
            return Ok(parameters);
        }
    }
}
